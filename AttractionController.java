package com.ziya.controller;

import com.ziya.model.*;
import com.ziya.repo.AttractionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/attractions")
@RequiredArgsConstructor
public class AttractionController {
    private final AttractionRepository attractionRepository;

    @GetMapping
    public List<Attraction> search(
            @RequestParam("campus") String campus,
            @RequestParam(value = "types", required = false) String types,
            @RequestParam(value = "budgets", required = false) String budgets,
            @RequestParam(value = "tripTypes", required = false) String tripTypes
    ) {
        CampusCode campusCode = CampusCode.valueOf(campus.toUpperCase(Locale.ROOT));

        List<AttractionType> typeList = StringUtils.hasText(types) ? Arrays.stream(types.split(","))
                .map(t -> AttractionType.valueOf(t.trim().toUpperCase(Locale.ROOT)))
                .collect(Collectors.toList()) : null;

        List<BudgetLevel> budgetList = StringUtils.hasText(budgets) ? Arrays.stream(budgets.split(","))
                .map(b -> BudgetLevel.valueOf(b.trim().toUpperCase(Locale.ROOT)))
                .collect(Collectors.toList()) : null;
        List<TripType> tripTypeList = StringUtils.hasText(tripTypes) ? Arrays.stream(tripTypes.split(","))
                .map(t -> TripType.valueOf(t.trim().toUpperCase(Locale.ROOT)))
                .collect(Collectors.toList()) : null;

        if (typeList == null && budgetList == null && tripTypeList == null) {
            return attractionRepository.findByCampusCode(campusCode);
        }
        if (typeList == null) typeList = Arrays.asList(AttractionType.values());
        if (budgetList == null) budgetList = Arrays.asList(BudgetLevel.values());
        // Base DB filter
        List<Attraction> base = attractionRepository.findByCampusCodeAndTypeInAndBudgetLevelIn(campusCode, typeList, budgetList);
        if (tripTypeList == null) {
            return base;
        }
        // In-memory include if attraction has no recommendations or intersects with requested trip types
        return base.stream()
                .filter(a -> a.getRecommendedTripTypes() == null || a.getRecommendedTripTypes().isEmpty()
                        || a.getRecommendedTripTypes().stream().anyMatch(tripTypeList::contains))
                .collect(Collectors.toList());
    }
}


