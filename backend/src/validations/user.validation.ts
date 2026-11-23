import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100).optional(),
  // Kosong diperbolehkan supaya user bisa menghapus nomor telepon dari profil.
  phone: z
    .string()
    .refine(
      (value) => value.trim() === '' || value.trim().length >= 8,
      'Nomor telepon minimal 8 karakter, atau kosongkan'
    )
    .optional(),
  address: z.string().optional(),
});

export const updatePasswordSchema = z.object({
  old_password: z.string().min(1, 'Password lama wajib diisi'),
  new_password: z.string().min(6, 'Password baru minimal 6 karakter'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

