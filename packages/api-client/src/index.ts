export type CommandResult<T> =
  | { ok: true; request_id: string; data: T }
  | {
      ok: false;
      request_id: string;
      error: { code: string; message: string; retryable: boolean; details?: Record<string, unknown> };
    };

export class ScootApi {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken: () => Promise<string | null>,
  ) {}

  async previewMatches(body: { intent_id: string; service_date: string }) {
    return this.post("/v1/matches/preview", body);
  }

  async requestBooking(body: Record<string, unknown>) {
    return this.post("/v1/bookings", body);
  }

  async acceptBooking(id: string, body: Record<string, unknown>) {
    return this.post(`/v1/bookings/${id}/accept`, body);
  }

  async confirmBooking(id: string, body: Record<string, unknown>) {
    return this.post(`/v1/bookings/${id}/confirm`, body);
  }

  async verifyPickup(tripId: string, body: Record<string, unknown>) {
    return this.post(`/v1/trips/${tripId}/pickup/verify`, body);
  }

  async publishLocation(tripId: string, body: Record<string, unknown>) {
    return this.post(`/v1/trips/${tripId}/location`, body);
  }

  async verifyDropoff(tripId: string, body: Record<string, unknown>) {
    return this.post(`/v1/trips/${tripId}/dropoff/verify`, body);
  }

  async reportIncident(body: Record<string, unknown>) {
    return this.post("/v1/safety/incidents", body);
  }

  private async post(path: string, body: unknown): Promise<CommandResult<unknown>> {
    const token = await this.getToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as CommandResult<unknown> & { data?: unknown; error?: CommandResult<unknown> extends { error: infer E } ? E : never };
    if ("error" in json && json.error) {
      return { ok: false, request_id: (json as { request_id: string }).request_id, error: json.error };
    }
    return { ok: true, request_id: (json as { request_id: string }).request_id, data: (json as { data: unknown }).data };
  }
}
