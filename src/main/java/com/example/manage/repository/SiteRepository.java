package com.example.manage.repository;

import com.example.manage.domain.Site;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SiteRepository extends JpaRepository<Site, Long> {

    boolean existsByName(String name);

    boolean existsByNameAndSiteIdNot(String name, Long siteId);
}
