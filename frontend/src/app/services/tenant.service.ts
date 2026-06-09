import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Company {
  id: string;
  name: string;
}

export interface TenantContext {
  companyId: string;
  roles: string[];
}

@Injectable({
  providedIn: 'root',
})
export class TenantService {
  private readonly apiUrl = 'http://localhost:8081';
  private activeTenant: TenantContext | null = null;

  constructor(private http: HttpClient) {}

  getMyCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.apiUrl}/me/companies`);
  }

  switchTenant(companyId: string): Observable<TenantContext> {
    return this.http.post<TenantContext>(`${this.apiUrl}/auth/switch-tenant`, { companyId });
  }

  setActiveTenant(tenant: TenantContext): void {
    this.activeTenant = tenant;
  }

  getActiveTenant(): TenantContext | null {
    return this.activeTenant;
  }

  hasActiveTenant(): boolean {
    return this.activeTenant !== null;
  }

  clearTenant(): void {
    this.activeTenant = null;
  }
}