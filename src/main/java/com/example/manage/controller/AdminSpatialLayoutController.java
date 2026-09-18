package com.example.manage.controller;

import com.example.manage.dto.SpatialLayoutForm;
import com.example.manage.service.SpatialLayoutService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.BindingResult;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.dao.DataAccessException;
import org.springframework.transaction.TransactionException;

@Controller @RequiredArgsConstructor
@RequestMapping("/admin/sites/{siteId}/spatial-layout")
public class AdminSpatialLayoutController {
    private final SpatialLayoutService layouts;

    @GetMapping
    public String page(@PathVariable Long siteId, Model model) {
        model.addAttribute("siteId", siteId);
        try { model.addAttribute("layout", layouts.load(siteId)); }
        catch (IllegalArgumentException exception) {
            model.addAttribute("errorMessage", "공간 모니터링 설정을 불러오지 못했습니다. Site와 이미지 저장소 상태를 확인해 주세요.");
        }
        return "admin/spatial-layout";
    }
    @PostMapping
    public String save(@PathVariable Long siteId, @ModelAttribute SpatialLayoutForm form,
                       BindingResult errors, RedirectAttributes flash) {
        try {
            if (errors.hasErrors()) throw new IllegalArgumentException("배치 입력값이 올바르지 않습니다. 화면에 다시 진입해 주세요.");
            layouts.save(siteId, form);
            flash.addFlashAttribute("successMessage", "HS 위치를 저장했습니다.");
        } catch (IllegalArgumentException exception) {
            flash.addFlashAttribute("errorMessage", exception.getMessage());
        } catch (DataAccessException | TransactionException exception) {
            flash.addFlashAttribute("errorMessage", "배치를 저장하지 못했습니다. 화면에 다시 진입해 주세요.");
        }
        return "redirect:/admin/sites/" + siteId + "/spatial-layout";
    }
}
