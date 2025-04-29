/**
 * Odoo JSON-RPC API client for React applications
 * This module provides functions to interact with Odoo ERP via JSON-RPC
 */
const DEFAULT_DB = import.meta.env.VITE_ODOO_DB || 'odoo16_prod_arkana';

interface OdooCredentials {
  username: string;
  password: string;
  db?: string;
}

interface OdooSession {
  uid: number;
  sessionId: string;
  context: Record<string, any>;
  username: string;
  password: string;
  db: string;
}

interface OdooResponse<T> {
  jsonrpc: string;
  id: number | string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data: {
      name: string;
      debug: string;
      message: string;
      arguments: any[];
      exception_type: string;
    };
  };
}

export class OdooClient {
  private session: OdooSession | null = null;
  private apiUrl: string;
  private defaultDb: string;
  private readonly SESSION_STORAGE_KEY = 'odoo_session';

  constructor(defaultDb: string = DEFAULT_DB) {
    //this.apiUrl = `/api/odoo`;  // Use our Express proxy
    this.apiUrl = 'https://arkana.co.id/jsonrpc';
    this.defaultDb = defaultDb;
    
    // Try to load session from localStorage on initialization
    this.loadSession();
  }
  
  private loadSession(): void {
    try {
      const savedSession = localStorage.getItem(this.SESSION_STORAGE_KEY);
      if (savedSession) {
        this.session = JSON.parse(savedSession);
        console.log('Session loaded from storage');
      }
    } catch (error) {
      console.error('Failed to load session from storage:', error);
      this.session = null;
    }
  }
  
  private saveSession(): void {
    try {
      if (this.session) {
        localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(this.session));
        console.log('Session saved to storage');
      } else {
        localStorage.removeItem(this.SESSION_STORAGE_KEY);
        console.log('Session cleared from storage');
      }
    } catch (error) {
      console.error('Failed to save session to storage:', error);
    }
  }

  public isAuthenticated(): boolean {
    return this.session !== null;
  }

  public getSession(): OdooSession | null {
    return this.session;
  }

  public async login(credentials: OdooCredentials): Promise<OdooSession> {
    const { username, password, db = this.defaultDb } = credentials;

    try {
      console.log(`Trying to login with ${username} to database ${db}`);
      
      // Build login request with proper format (3 arguments)
      const loginRequest = {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'common',
          method: 'login',
          args: [db, username, password] // Remove the empty context argument
        },
        id: new Date().getTime()
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginRequest),
        credentials: 'include',
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (data.error) {
        throw new Error(data.error.message || 'Authentication failed');
      }

      if (!data.result) {
        throw new Error('Invalid username or password');
      }

      const uid = data.result as number;

      // Create session with all required fields
      this.session = {
        uid,
        sessionId: 'dummy-session-id',
        context: {},
        username,
        password,
        db,
      };

      // Save session to localStorage
      this.saveSession();

      return this.session;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  public logout(): void {
    this.session = null;
    this.saveSession(); // Remove session from storage
  }

  /**
   * Call Odoo JSON-RPC endpoint
   */
  public async call<T = any>(params: {
    service?: string;
    model?: string;
    method: string;
    args?: any[];
    kwargs?: Record<string, any>;
  }): Promise<T> {
    const { service = 'object', model, method, args = [], kwargs = {} } = params;
    
    // Build request parameters
    let requestParams: any = {};
    let payload: any[] = [];
    
    if (service === 'common') {
      // Common service calls
      requestParams = {
        service,
        method,
        args
      };
    } else {
      // Object service calls (requires authentication)
      if (!this.session?.uid) {
        throw new Error('Not authenticated');
      }
      
      if (model) {
        // Model method calls
        // Ensure we have all required parameters
        if (!this.session.db || !this.session.uid || !this.session.password) {
          throw new Error('Missing required session parameters');
        }

        // Ensure kwargs is always an object
        const finalKwargs = kwargs || {};

        requestParams = {
          service: 'object',
          method: 'execute_kw',
          args: [
            this.session.db, 
            this.session.uid,
            this.session.password,
            model,
            method,
            args,
            finalKwargs
          ]
        };

        // Log the request for debugging
        console.log('Odoo API Request:', {
          service: 'object',
          model,
          method,
          args: args.length,
          hasKwargs: !!finalKwargs
        });
      } else {
        // Direct service calls
        requestParams = {
          service,
          method,
          args
        };
      }
    }
    
    const requestData = {
      jsonrpc: '2.0',
      method: 'call',
      params: requestParams,
      id: new Date().getTime()
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as OdooResponse<T>;

      if (result.error) {
        // If error is about non-existent model or access rights, return empty result
        if (result.error.data?.message?.includes('does not exist') || 
            result.error.data?.message?.includes('access rights')) {
          console.log(`Model ${model} does not exist or no access rights`);
          return [] as unknown as T;
        }
        console.error('Odoo API Error:', result.error);
        throw new Error(result.error.message || 'Unknown error occurred');
      }

      return result.result as T;
    } catch (error) {
      console.error('Odoo API Call Error:', error);
      throw error;
    }
  }

  /**
   * Shortcut for a search_read operation (most common Odoo operation)
   */
  public async searchRead<T = any>(params: {
    model: string;
    domain?: any[];
    fields?: string[];
    limit?: number;
    offset?: number;
    order?: string;
    context?: Record<string, any>;
  }): Promise<T[]> {
    const { model, domain = [], fields = [], limit, offset, order, context = {} } = params;
    
    const kwargs: Record<string, any> = { context };
    if (fields.length > 0) kwargs.fields = fields;
    if (limit !== undefined) kwargs.limit = limit;
    if (offset !== undefined) kwargs.offset = offset;
    if (order) kwargs.order = order;

    console.log(`searchRead: ${model}`, { domain, fields, limit, order });
    
    try {
      const result = await this.call<T[]>({
        model,
        method: 'search_read',
        args: [domain],
        kwargs,
      });
      
      // Return empty array if result is null or undefined
      if (!result) {
        console.log(`No results found for ${model}`);
        return [] as T[];
      }
      
      console.log(`searchRead result for ${model}:`, result);
      return result;
    } catch (error) {
      console.error(`searchRead error for ${model}:`, error);
      // Return empty array instead of throwing to prevent component crashes
      return [] as T[];
    }
  }

  /**
   * Shortcut for a write operation
   */
  public async write<T = any>(params: {
    model: string;
    ids: number[];
    values: Record<string, any>;
    context?: Record<string, any>;
  }): Promise<boolean> {
    const { model, ids, values, context = {} } = params;
    
    try {
      const result = await this.call<boolean>({
        model,
        method: 'write',
        args: [ids, values],
        kwargs: { context },
      });
      
      return result;
    } catch (error) {
      console.error(`write error for ${model}:`, error);
      throw error;
    }
  }

  /**
   * Shortcut for a create operation
   */
  public async create<T = any>(params: {
    model: string;
    values: Record<string, any>;
    context?: Record<string, any>;
  }): Promise<number> {
    const { model, values, context = {} } = params;
    
    try {
      const result = await this.call<number>({
        model,
        method: 'create',
        args: [values],
        kwargs: { context },
      });
      
      return result;
    } catch (error) {
      console.error(`create error for ${model}:`, error);
      throw error;
    }
  }

  /**
   * Shortcut for an unlink (delete) operation
   */
  public async unlink<T = any>(params: {
    model: string;
    ids: number[];
    context?: Record<string, any>;
  }): Promise<boolean> {
    const { model, ids, context = {} } = params;
    
    try {
      const result = await this.call<boolean>({
        model,
        method: 'unlink',
        args: [ids],
        kwargs: { context },
      });
      
      return result;
    } catch (error) {
      console.error(`unlink error for ${model}:`, error);
      throw error;
    }
  }

  /**
   * Shortcut for a read operation
   */
  public async read<T = any>(params: {
    model: string;
    ids: number[];
    fields?: string[];
    context?: Record<string, any>;
  }): Promise<T[]> {
    const { model, ids, fields = [], context = {} } = params;
    
    const kwargs: Record<string, any> = { context };
    if (fields.length > 0) kwargs.fields = fields;
    
    try {
      const result = await this.call<T[]>({
        model,
        method: 'read',
        args: [ids],
        kwargs,
      });
      
      return result || [];
    } catch (error) {
      console.error(`read error for ${model}:`, error);
      return [];
    }
  }

  /**
   * Shortcut for a search operation
   */
  public async search<T = any>(params: {
    model: string;
    domain?: any[];
    limit?: number;
    offset?: number;
    order?: string;
    context?: Record<string, any>;
  }): Promise<number[]> {
    const { model, domain = [], limit, offset, order, context = {} } = params;
    
    const kwargs: Record<string, any> = { context };
    if (limit !== undefined) kwargs.limit = limit;
    if (offset !== undefined) kwargs.offset = offset;
    if (order) kwargs.order = order;
    
    try {
      const result = await this.call<number[]>({
        model,
        method: 'search',
        args: [domain],
        kwargs,
      });
      
      return result || [];
    } catch (error) {
      console.error(`search error for ${model}:`, error);
      return [];
    }
  }

  /**
   * Shortcut for a name_get operation
   */
  public async nameGet<T = any>(params: {
    model: string;
    ids: number[];
    context?: Record<string, any>;
  }): Promise<[number, string][]> {
    const { model, ids, context = {} } = params;
    
    try {
      const result = await this.call<[number, string][]>({
        model,
        method: 'name_get',
        args: [ids],
        kwargs: { context },
      });
      
      return result || [];
    } catch (error) {
      console.error(`name_get error for ${model}:`, error);
      return [];
    }
  }

  /**
   * Shortcut for a name_search operation
   */
  public async nameSearch<T = any>(params: {
    model: string;
    name: string;
    operator?: string;
    args?: any[];
    limit?: number;
    context?: Record<string, any>;
  }): Promise<[number, string][]> {
    const { model, name, operator = 'ilike', args = [], limit, context = {} } = params;
    
    const kwargs: Record<string, any> = { context };
    if (limit !== undefined) kwargs.limit = limit;
    
    try {
      const result = await this.call<[number, string][]>({
        model,
        method: 'name_search',
        args: [name, args, operator],
        kwargs,
      });
      
      return result || [];
    } catch (error) {
      console.error(`name_search error for ${model}:`, error);
      return [];
    }
  }

  /**
   * Upload an attachment for an expense
   */
  public async uploadExpenseAttachment(file: File, expenseId: number): Promise<number> {
    if (!this.session?.uid) {
      throw new Error('Not authenticated');
    }

    // Convert file to base64
    const base64File = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Remove the data URL prefix
    const base64Data = base64File.split(',')[1];

    try {
      const result = await this.call<number>({
        service: 'object',
        method: 'execute_kw',
        args: [
          this.session.db,
          this.session.uid,
          this.session.password,
          'ir.attachment',
          'create',
          [{
            name: file.name,
            datas: base64Data,
            res_model: 'hr.expense',
            res_id: expenseId,
            mimetype: file.type,
          }],
          {}
        ]
      });

      return result;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw new Error('Failed to upload attachment');
    }
  }

  public getApiUrl(): string {
    return this.apiUrl;
  }
}

// Create a singleton instance
const odooClient = new OdooClient();
export default odooClient;
