package dev.poc.sso.config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DefaultOAuth2AuthenticatedPrincipal;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class KeycloakRoleConverter implements
    Converter<DefaultOAuth2AuthenticatedPrincipal, Collection<GrantedAuthority>> {

    @Override
    public Collection<GrantedAuthority> convert(DefaultOAuth2AuthenticatedPrincipal principal) {
        Map<String, Object> realmAccess = principal.getAttribute("realm_access");

        if (realmAccess == null || !realmAccess.containsKey("roles")) {
            return List.of();
        }

        @SuppressWarnings("unchecked")
        List<String> roles = (List<String>) realmAccess.get("roles");

        return roles.stream()
            .map(SimpleGrantedAuthority::new)
            .collect(Collectors.toList());
    }
}