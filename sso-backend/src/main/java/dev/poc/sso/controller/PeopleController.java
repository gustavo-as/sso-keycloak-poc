package dev.poc.sso.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import dev.poc.sso.model.Person;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/people")
public class PeopleController {

    private final List<Person> people = new ArrayList<>(List.of(
        new Person(1L, "Alice Silva", "alice@poc.dev"),
        new Person(2L, "Bob Souza",  "bob@poc.dev"),
        new Person(3L, "Carol Lima", "carol@poc.dev")
    ));

    @GetMapping
    public ResponseEntity<List<Person>> listPeople() {
        return ResponseEntity.ok(people);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePerson(@PathVariable Long id, Authentication authentication) {
        
        boolean isAdmin = authentication.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .anyMatch(role -> role.equals("ROLE_ADMIN"));

        if (!isAdmin) {
            return ResponseEntity.status(403).build();
        }

        people.removeIf(p -> p.id().equals(id));
        return ResponseEntity.noContent().build();
    }
}