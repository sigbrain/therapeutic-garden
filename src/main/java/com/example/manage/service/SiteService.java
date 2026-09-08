package com.example.manage.service;

import com.example.manage.domain.Site;
import com.example.manage.repository.SiteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SiteService {

    private final SiteRepository siteRepository;

    // 실제 Site 등록
    public Site createSite(
            String name,
            String address,
            Double latitude,
            Double longitude,
            Integer mapLevel
    ) {
        if (siteRepository.existsByName(name)) {
            throw new IllegalArgumentException("이미 존재하는 Site 이름입니다.");
        }

        Site site = new Site(
                name,
                address,
                latitude,
                longitude,
                mapLevel
        );

        return siteRepository.save(site);
    }
}