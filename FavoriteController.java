package com.ziya.controller;

import com.ziya.model.Favorite;
import com.ziya.repo.FavoriteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {
    private final FavoriteRepository favoriteRepository;

    @GetMapping("/{userId}")
    public List<Favorite> list(@PathVariable String userId) {
        return favoriteRepository.findByUserId(userId);
    }

    @PostMapping
    public Favorite add(@RequestBody Favorite f) {
        return favoriteRepository.save(f);
    }

    @DeleteMapping
    public ResponseEntity<?> remove(@RequestParam String userId, @RequestParam String attractionId) {
        favoriteRepository.deleteByUserIdAndAttractionId(userId, attractionId);
        return ResponseEntity.ok(Map.of("removed", attractionId));
    }
}


