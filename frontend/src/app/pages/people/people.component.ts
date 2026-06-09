import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { OAuthService } from 'angular-oauth2-oidc';

interface Person {
  id: number;
  name: string;
  email: string;
}

@Component({
  selector: 'app-people',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './people.component.html',
  styleUrl: './people.component.css',
})
export class PeopleComponent implements OnInit {
  people: Person[] = [];
  loading = true;
  error = '';
  username = '';
  isAdmin = false;

  constructor(
    private http: HttpClient,
    private oauthService: OAuthService
  ) {}

  ngOnInit(): void {
    const claims = this.oauthService.getIdentityClaims() as any;
    this.username = claims?.['preferred_username'] ?? '';

    const token = this.oauthService.getAccessToken();
    const payload = token ? JSON.parse(atob(token.split('.')[1])) : {};
    const roles = payload?.realm_access?.roles ?? [];
    this.isAdmin = roles.includes('ROLE_ADMIN');

    this.http.get<Person[]>('http://localhost:8081/people').subscribe({
      next: (data) => {
        this.people = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load people. Please try again.';
        this.loading = false;
        console.error(err);
      },
    });
  }

  deletePerson(id: number): void {
    this.http.delete(`http://localhost:8081/people/${id}`).subscribe({
      next: () => {
        this.people = this.people.filter(p => p.id !== id);
      },
      error: (err) => {
        console.error('Delete failed', err);
      },
    });
  }

  logout(): void {
    this.oauthService.logOut();
  }
}