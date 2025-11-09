package com.fintech.payments.infrastructure.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Interceptor to enforce rate limiting on payment endpoints.
 */
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitInterceptor.class);

    private final RateLimitService rateLimitService;

    public RateLimitInterceptor(RateLimitService rateLimitService) {
        this.rateLimitService = rateLimitService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Only apply rate limiting to payment endpoints
        String requestURI = request.getRequestURI();
        if (!requestURI.startsWith("/v1/payments")) {
            return true;
        }

        // Get user identifier from JWT
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String identifier = "anonymous";

        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            identifier = jwt.getSubject();
        } else {
            // Fallback to IP address for unauthenticated requests
            identifier = getClientIP(request);
        }

        // Check rate limit
        if (!rateLimitService.isAllowed(identifier)) {
            logger.warn("Rate limit exceeded for user: {}", identifier);

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("""
                {
                    "error": "Too many requests",
                    "message": "Rate limit exceeded. Please try again later.",
                    "retryAfter": """ + rateLimitService.getResetTime(identifier) + """
                }
                """);

            return false;
        }

        // Add rate limit headers
        long remaining = rateLimitService.getRemainingRequests(identifier);
        long resetTime = rateLimitService.getResetTime(identifier);

        response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));
        response.setHeader("X-RateLimit-Reset", String.valueOf(resetTime));

        return true;
    }

    private String getClientIP(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIP = request.getHeader("X-Real-IP");
        if (xRealIP != null && !xRealIP.isEmpty()) {
            return xRealIP;
        }

        return request.getRemoteAddr();
    }
}
