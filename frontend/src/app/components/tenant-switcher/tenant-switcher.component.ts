import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TenantService, Company, TenantContext } from '../../services/tenant.service';

@Component({
  selector: 'app-tenant-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tenant-switcher.component.html',
  styleUrl: './tenant-switcher.component.css',
})
export class TenantSwitcherComponent implements OnInit {
  companies: Company[] = [];
  activeTenantId = '';
  isOpen = false;

  constructor(private tenantService: TenantService) {}

  ngOnInit(): void {
    this.activeTenantId = this.tenantService.getActiveTenant()?.companyId ?? '';

    this.tenantService.getMyCompanies().subscribe({
      next: (data) => this.companies = data,
    });

    this.tenantService.tenantChanged$.subscribe(tenant => {
      if (tenant) this.activeTenantId = tenant.companyId;
    });
  }

  get activeCompanyName(): string {
    return this.companies.find(c => c.id === this.activeTenantId)?.name ?? this.activeTenantId;
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
  }

  select(company: Company): void {
    if (company.id === this.activeTenantId) {
      this.isOpen = false;
      return;
    }

    this.tenantService.switchTenant(company.id).subscribe({
      next: (context: TenantContext) => {
        this.tenantService.setActiveTenant(context);
        this.activeTenantId = context.companyId;
        this.isOpen = false;
        window.location.reload();
      },
    });
  }

  closeDropdown(): void {
    this.isOpen = false;
  }
}