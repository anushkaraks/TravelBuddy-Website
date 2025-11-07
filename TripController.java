package com.ziya.controller;

import com.ziya.model.Trip;
import com.ziya.repo.TripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/trips")
@RequiredArgsConstructor
public class TripController {
    private final TripRepository tripRepository;

    @GetMapping("/{userId}")
    public List<Trip> list(@PathVariable String userId) {
        return tripRepository.findByUserId(userId);
    }

    @PostMapping
    public Trip create(@RequestBody Trip t) {
        t.setId(null);
        t.setCreatedAt(Instant.now());
        return tripRepository.save(t);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        tripRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("deleted", id));
    }
}


