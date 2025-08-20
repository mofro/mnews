// Test file with relative imports to verify component functionality
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
import logger from './utils/logger';

// These imports should work with relative paths
logger.debug('Button:', Button);
logger.debug('cn:', cn);
