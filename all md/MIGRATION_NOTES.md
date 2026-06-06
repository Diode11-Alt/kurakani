# Migration Notes

**Important:** End-to-End Encryption (E2EE) was temporarily disabled at the database level in migration `20260603000007_remove_e2ee.sql` to support a plaintext implementation.

It is currently being restored in the client applications. The `content` and `media_url` columns were added as plaintext fields during this period. E2EE restoration involves migrating back to using the `ciphertext` and `ciphertext_type` columns via `@kurakani/crypto`.
