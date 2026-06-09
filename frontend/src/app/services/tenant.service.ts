import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

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
  private readonly TENANT_KEY = 'active_tenant';
  private activeTenant: TenantContext | null = null;

  private showModalSubject = new BehaviorSubject<boolean>(false);
  showModal$ = this.showModalSubject.asObservable();

  constructor(private http: HttpClient) {}

  getMyCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.apiUrl}/me/companies`);
  }

  switchTenant(companyId: string): Observable<TenantContext> {
    return this.http.post<TenantContext>(`${this.apiUrl}/auth/switch-tenant`, { companyId });
  }

  setActiveTenant(tenant: TenantContext): void {
    this.activeTenant = tenant;
    sessionStorage.setItem(this.TENANT_KEY, JSON.stringify(tenant));
    this.showModalSubject.next(false);
  }

  getActiveTenant(): TenantContext | null {
    if (this.activeTenant) {
      return this.activeTenant;
    }
    const stored = sessionStorage.getItem(this.TENANT_KEY);
    if (stored) {
      this.activeTenant = JSON.parse(stored);
      return this.activeTenant;
    }
    return null;
  }

  hasActiveTenant(): boolean {
    return this.getActiveTenant() !== null;
  }

  clearTenant(): void {
    this.activeTenant = null;
    sessionStorage.removeItem(this.TENANT_KEY);
  }

  openModal(): void {
    this.showModalSubject.next(true);
  }

  closeModal(): void {
    this.showModalSubject.next(false);
  }
}