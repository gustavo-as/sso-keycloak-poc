package dev.poc.sso.config;

import dev.poc.sso.repository.TenantRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.BearerTokenAuthentication;
import org.springframework.security.oauth2.server.resource.introspection.OAuth2IntrospectionAuthenticatedPrincipal;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class TenantContextFilter extends OncePerRequestFilter {

    private final TenantRepository tenantRepository;

    public TenantContextFilter(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {

        String tenantId = request.getHeader("X-Tenant-ID");
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (tenantId != null && authentication instanceof BearerTokenAuthentication bearerAuth) {
            String username = authentication.getName();

            tenantRepository.findUserCompany(username, tenantId).ifPresent(uc -> {
                List<GrantedAuthority> authorities = new ArrayList<>();
                uc.roles().stream()
                    .map(role -> (GrantedAuthority) new SimpleGrantedAuthority(role))
                    .forEach(authorities::add);

                Map<String, Object> attributes = bearerAuth.getTokenAttributes();

                String name = (String) attributes.getOrDefault("preferred_username",
                    attributes.getOrDefault("username", username));

                var newPrincipal = new OAuth2IntrospectionAuthenticatedPrincipal(
                    name,
                    attributes,
                    authorities
                );

                var newAuth = new BearerTokenAuthentication(
                    newPrincipal,
                    bearerAuth.getToken(),
                    authorities
                );

                SecurityContextHolder.getContext().setAuthentication(newAuth);
            });
        }

        filterChain.doFilter(request, response);
    }
}