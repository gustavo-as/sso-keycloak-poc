package dev.poc.sso.repository;

import dev.poc.sso.model.Company;
import dev.poc.sso.model.UserCompany;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class TenantRepository {

    private static final List<Company> COMPANIES = List.of(
        new Company("acme",   "Acme Corp"),
        new Company("globex", "Globex Inc")
    );

    private static final List<UserCompany> USER_COMPANIES = List.of(
        new UserCompany("user@poc.dev",  "acme",   List.of("ROLE_USER")),
        new UserCompany("user@poc.dev",  "globex", List.of("ROLE_ADMIN")),
        new UserCompany("admin@poc.dev", "acme",   List.of("ROLE_ADMIN"))
    );

    public List<Company> findCompaniesByUsername(String username) {
        return USER_COMPANIES.stream()
            .filter(uc -> uc.username().equals(username))
            .map(uc -> COMPANIES.stream()
                .filter(c -> c.id().equals(uc.companyId()))
                .findFirst()
                .orElseThrow())
            .toList();
    }

    public Optional<UserCompany> findUserCompany(String username, String companyId) {
        return USER_COMPANIES.stream()
            .filter(uc -> uc.username().equals(username) && uc.companyId().equals(companyId))
            .findFirst();
    }
}