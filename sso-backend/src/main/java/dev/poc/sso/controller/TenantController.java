package dev.poc.sso.controller;

import dev.poc.sso.model.Company;
import dev.poc.sso.model.UserCompany;
import dev.poc.sso.repository.TenantRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class TenantController {

    private final TenantRepository tenantRepository;

    public TenantController(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    @GetMapping("/me/companies")
public ResponseEntity<List<Company>> getMyCompanies(Authentication authentication) {
    System.out.println("USERNAME: " + authentication.getName());
    String username = authentication.getName();
    return ResponseEntity.ok(tenantRepository.findCompaniesByUsername(username));
}

    @PostMapping("/auth/switch-tenant")
    public ResponseEntity<Map<String, Object>> switchTenant(
        @RequestBody Map<String, String> body,
        Authentication authentication
    ) {
        String username = authentication.getName();
        String companyId = body.get("companyId");

        return tenantRepository.findUserCompany(username, companyId)
            .map(uc -> ResponseEntity.ok(Map.of(
                "companyId", uc.companyId(),
                "roles", uc.roles()
            )))
            .orElse(ResponseEntity.status(403).build());
    }
}