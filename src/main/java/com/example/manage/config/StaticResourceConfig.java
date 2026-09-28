package com.example.manage.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.ResourceHttpRequestHandler;
import org.springframework.web.servlet.resource.ResourceUrlEncodingFilter;
import org.springframework.web.servlet.resource.VersionResourceResolver;

import java.time.Duration;
import java.util.regex.Pattern;

/** Only classpath assets are cacheable; Security's dynamic response policy is unchanged. */
@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {
    private static final String[] PATHS = {"/images/**", "/css/**", "/js/**"};
    private static final Pattern CONTENT_VERSION = Pattern.compile(".*-[0-9a-f]{32}\\.[^/]+$");
    private static final String VERSIONED_CACHE = CacheControl.maxAge(Duration.ofDays(365))
            .cachePublic().immutable().getHeaderValue();

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        for (String directory : new String[]{"images", "css", "js"}) {
            registry.addResourceHandler("/" + directory + "/**")
                    .addResourceLocations("classpath:/static/" + directory + "/")
                    // The interceptor distinguishes versioned and unversioned requests.
                    .setCachePeriod(-1)
                    .resourceChain(true)
                    .addResolver(new VersionResourceResolver().addContentVersionStrategy("/**"));
        }
    }

    @Bean
    public ResourceUrlEncodingFilter resourceUrlEncodingFilter() {
        // Thymeleaf @{...} URLs automatically receive the current content hash.
        return new ResourceUrlEncodingFilter();
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
                if (handler instanceof ResourceHttpRequestHandler
                        && ("GET".equals(request.getMethod()) || "HEAD".equals(request.getMethod()))) {
                    // Bare URLs may be used by older pages or bookmarks: store but always revalidate.
                    response.setHeader(HttpHeaders.CACHE_CONTROL,
                            CONTENT_VERSION.matcher(request.getRequestURI()).matches()
                                    ? VERSIONED_CACHE : CacheControl.noCache().getHeaderValue());
                }
                return true;
            }
        }).addPathPatterns(PATHS);
    }
}
