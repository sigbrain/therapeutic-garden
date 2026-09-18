package com.example.manage.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
public class SiteImage extends ManagedImage {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id", nullable = false)
    private Site site;

    public SiteImage(Site site, String objectKey, String originalFileName,
                       String contentType, int displayOrder, boolean representative) {
        super(objectKey, originalFileName, contentType, displayOrder, representative);
        this.site = site;
    }
}
