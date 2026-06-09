import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TenantService } from './services/tenant.service';
import { TenantModalComponent } from './components/tenant-modal/tenant-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, TenantModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit{
  showModal = false;

    constructor(private tenantService: TenantService) {}

  ngOnInit(): void {
    this.tenantService.showModal$.subscribe(show => {
      this.showModal = show;
    });
  }
}
