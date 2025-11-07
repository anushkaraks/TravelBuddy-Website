package com.ziya.controller;

import com.ziya.model.Rating;
import com.ziya.repo.RatingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/ratings")
@RequiredArgsConstructor
public class RatingController {
    private final RatingRepository ratingRepository;

    @GetMapping("/attraction/{attractionId}")
    public List<Rating> listForAttraction(@PathVariable String attractionId) {
        return ratingRepository.findByAttractionId(attractionId);
    }

    @PostMapping
    public Rating add(@RequestBody Rating r) {
        r.setId(null);
        r.setCreatedAt(Instant.now());
        return ratingRepository.save(r);
    }
}


