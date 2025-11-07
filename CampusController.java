package com.ziya.controller;

import com.ziya.model.Campus;
import com.ziya.repo.CampusRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/campuses")
@RequiredArgsConstructor
public class CampusController {
    private final CampusRepository campusRepository;

    @GetMapping
    public List<Campus> list() {
        return campusRepository.findAll();
    }
}


