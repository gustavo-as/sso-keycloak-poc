package dev.poc.sso.model;

import java.util.List;

public record UserCompany(String username, String companyId, List<String> roles) {}