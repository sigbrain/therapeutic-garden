package com.example.manage.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SiteForm {

    @NotBlank(message = "사이트명을 입력해 주세요.")
    @Size(max = 255, message = "사이트명은 255자 이하여야 합니다.")
    private String name;

    @NotBlank(message = "주소를 입력해 주세요.")
    @Size(max = 255, message = "주소는 255자 이하여야 합니다.")
    private String address;

    @NotNull(message = "위도를 입력해 주세요.")
    @DecimalMin(value = "-90", message = "위도는 -90 이상이어야 합니다.")
    @DecimalMax(value = "90", message = "위도는 90 이하여야 합니다.")
    private Double latitude;

    @NotNull(message = "경도를 입력해 주세요.")
    @DecimalMin(value = "-180", message = "경도는 -180 이상이어야 합니다.")
    @DecimalMax(value = "180", message = "경도는 180 이하여야 합니다.")
    private Double longitude;

    @NotNull(message = "지도 레벨을 입력해 주세요.")
    @Min(value = 1, message = "지도 레벨은 1 이상이어야 합니다.")
    @Max(value = 14, message = "지도 레벨은 14 이하여야 합니다.")
    private Integer mapLevel;
}
