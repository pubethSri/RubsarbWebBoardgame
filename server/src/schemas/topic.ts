import { z } from 'zod';

export const CreatePackSchema = z.object({
    name: z.string().min(3).max(30),
    author: z.string().min(2).max(20),
    topics: z.array(
        z.object({
            topic: z.string().min(1).max(200),
            type: z.enum(['NORMAL', 'SPICY']).default('NORMAL')
        })
    ).min(5).max(50)
});

export type CreatePackInput = z.infer<typeof CreatePackSchema>;
