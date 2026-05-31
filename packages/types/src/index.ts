import { z } from 'zod';

export const RegisterRequestSchema = z.object({
  phoneNumber: z.string().min(10).max(20),
  username: z.string().min(3).max(50).optional(),
  deviceId: z.number().int().positive(),
  identityKey: z.string(), // base64
  signedPreKey: z.object({
    keyId: z.number().int(),
    publicKey: z.string(), // base64
    signature: z.string(), // base64
  }),
  oneTimePreKeys: z.array(z.object({
    keyId: z.number().int(),
    publicKey: z.string(), // base64
  })).min(1).max(100),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const AuthResponseSchema = z.object({
  token: z.string(),
  userId: z.string().uuid(),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
