import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { TenantService, Company, TenantContext } from '../../services/tenant.service';

interface CompanyWithRole extends Company {
  role: string;
}

@Component({
  selector: 'app-tenant-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tenant-modal.component.html',
  styleUrl: './tenant-modal.component.css',
})
export class TenantModalComponent implements OnInit {
  companies: CompanyWithRole[] = [];
  loading = true;
  error = '';
  username = '';

  constructor(
    private tenantService: TenantService,
    private oauthService: OAuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const claims = this.oauthService.getIdentityClaims() as any;
    this.username = claims?.['name'] ?? claims?.['preferred_username'] ?? '';

    this.tenantService.getMyCompanies().subscribe({
      next: (companies) => {
        this.companies = companies.map(company => ({
          ...company,
          role: 'Member',
        }));
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load organizations. Please try again.';
        this.loading = false;
      },
    });
  }

  selectCompany(companyId: string): void {
    this.tenantService.switchTenant(companyId).subscribe({
      next: (context: TenantContext) => {
        this.tenantService.setActiveTenant(context);
        this.router.navigate(['/people']);
      },
      error: () => {
        this.error = 'Failed to select organization. Please try again.';
      },
    });
  }
}