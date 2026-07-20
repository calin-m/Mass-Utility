// @Arch[FetchService]
// @Description: A decoupled, standalone HTTP client utility that prepares form payloads, injects security tokens, and queries SaaS endpoints.

export class FetchService {
  static async post(action: string, payload: any = {}): Promise<any> {
    const config = (window as any).PM_CONFIG || {};
    const basePath = config.basePath || '';
    const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
    const url = `${cleanBase}/api/v1/${action}`;

    const formData = new FormData();
    Object.keys(payload).forEach(key => {
      let value = payload[key];
      if (typeof value === 'object' && value !== null) {
        value = JSON.stringify(value);
      }
      formData.append(key, value);
    });

    formData.set('ajax', '1');
    formData.set('action', action);

    if (config.securityToken) {
      formData.set('token', config.securityToken);
    }

    const headers: Record<string, string> = {};
    if (config.csrfToken) {
      headers['X-CSRF-Token'] = config.csrfToken;
    }

    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      headers
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Request failed.');
    }
    return data;
  }
}
