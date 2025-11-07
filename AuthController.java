package com.ziya.controller;

import com.ziya.model.User;
import com.ziya.repo.UserRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest req) {
        if (userRepository.findByEmail(req.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));
        }
        User u = User.builder()
                .email(req.getEmail())
                .displayName(req.getDisplayName())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .build();
        userRepository.save(u);
        return ResponseEntity.ok(Map.of("message", "Signup successful"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        return userRepository.findByEmail(req.getEmail())
                .filter(u -> passwordEncoder.matches(req.getPassword(), u.getPasswordHash()))
                .<ResponseEntity<?>>map(u -> ResponseEntity.ok(Map.of(
                        "token", u.getId(),
                        "user", Map.of("id", u.getId(), "email", u.getEmail(), "displayName", u.getDisplayName())
                )))
                .orElse(ResponseEntity.status(401).body(Map.of("error", "Invalid credentials")));
    }

    @Data
    public static class SignupRequest {
        private String email;
        private String password;
        private String displayName;
    }

    @Data
    public static class LoginRequest {
        private String email;
        private String password;
    }
}


