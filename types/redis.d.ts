declare module '@/lib/redis' {
  export function updateNewsletterReadStatus(
    id: string, 
    isRead: boolean
  ): Promise<boolean>;
}
