package dev.poc.sso.controller;

import dev.poc.sso.model.Person;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/people")
public class PeopleController {

    @GetMapping
    public ResponseEntity<List<Person>> listPeople() {
        var people = List.of(
            new Person(1L, "Alice Silva", "alice@poc.dev"),
            new Person(2L, "Bob Souza",  "bob@poc.dev"),
            new Person(3L, "Carol Lima", "carol@poc.dev")
        );
        return ResponseEntity.ok(people);
    }
}