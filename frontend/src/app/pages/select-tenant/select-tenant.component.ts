import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TenantService, Company } from '../../services/tenant.service';

@Component({
  selector: 'app-select-tenant',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './select-tenant.component.html',
  styleUrl: './select-tenant.component.css'
})
export class SelectTenantComponent implements OnInit {

  companies: Company[] = [];
  loading = true;
  error = '';

  constructor(
    private tenantService: TenantService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.tenantService.getMyCompanies().subscribe({
      next: (data) => {
        this.companies = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load companies. Please try again.';
        this.loading = false;
        console.error(err);
      },
    });
  }

  selectCompany(companyId: string): void {
    this.tenantService.switchTenant(companyId).subscribe({
      next: (context) => {
        this.tenantService.setActiveTenant(context);
        this.router.navigate(['/people']);
      },
      error: (err) => {
        this.error = 'Failed to switch tenant. Please try again.';
        console.error(err);
      },
    });
  }


}
