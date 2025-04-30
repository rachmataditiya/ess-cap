import { useState } from "react";
import { LoadingFallback } from "@/components/ui/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useResources, type ResourceEvent } from "@/hooks/useOdoo";

export default function Resources() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const { events, isLoading } = useResources();

  if (isLoading) {
    return <LoadingFallback />;
  }

  const getEventsForDate = (date: Date) => {
    return events?.filter((event: ResourceEvent) => {
      const eventDate = new Date(event.start_date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Resources Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="calendar" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="calendar" onClick={() => setView("calendar")}>
                Calendar
              </TabsTrigger>
              <TabsTrigger value="list" onClick={() => setView("list")}>
                List View
              </TabsTrigger>
            </TabsList>
            <TabsContent value="calendar">
              <div className="flex flex-col space-y-4">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={id}
                  className="rounded-md border"
                />
                {date && (
                  <div className="space-y-2">
                    <h3 className="font-medium">
                      Events on {format(date, "EEEE, d MMMM yyyy", { locale: id })}
                    </h3>
                    <div className="space-y-2">
                      {getEventsForDate(date)?.map((event: ResourceEvent) => (
                        <Card key={event.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{event.employee_id[1]}</p>
                                <p className="text-sm text-muted-foreground">
                                  {event.name}
                                </p>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(event.start_date), "HH:mm")} -{" "}
                                {format(new Date(event.end_date), "HH:mm")}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="list">
              <div className="space-y-2">
                {events?.map((event: ResourceEvent) => (
                  <Card key={event.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{event.employee_id[1]}</p>
                          <p className="text-sm text-muted-foreground">
                            {event.name}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(event.start_date), "d MMM yyyy", {
                            locale: id,
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 