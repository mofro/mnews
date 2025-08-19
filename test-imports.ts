// Test file to verify TypeScript path aliases
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import logger from '@/utils/logger';

// These imports should work if path aliases are configured correctly
logger.debug('Button:', Button);
logger.debug('cn:', cn);
