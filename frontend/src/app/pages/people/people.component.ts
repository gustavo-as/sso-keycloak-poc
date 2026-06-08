import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { KeycloakService } from 'keycloak-angular';

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
  styleUrl: './people.component.css'
})
export class PeopleComponent implements OnInit{
  people: Person[] = [];
  loading = true;
  error = '';
  username = '';


  constructor(private http: HttpClient,
    private keycloak: KeycloakService
  ) {}

  ngOnInit(): void {
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

  logout(): void {
    this.keycloak.logout('http://localhost:4200');
  }

}