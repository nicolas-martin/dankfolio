const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to add modular headers for Firebase-related pods
 * This ensures the setting persists across Expo prebuild regenerations
 */
function withGoogleUtilitiesModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');
        
        // Check if Firebase modular headers are already added
        if (!podfileContent.includes("pod 'GoogleUtilities', :modular_headers => true")) {
          // Find the target section and add Firebase pods with modular headers
          const targetMatch = podfileContent.match(/(target\s+['"][^'"]+['"]\s+do\s*\n\s*use_expo_modules!)/);
          
          if (targetMatch) {
            const replacement = targetMatch[1] + '\n\n  # Force Firebase-related pods to use modular headers to fix Swift pod integration\n  pod \'GoogleUtilities\', :modular_headers => true\n  pod \'FirebaseCore\', :modular_headers => true';
            podfileContent = podfileContent.replace(targetMatch[1], replacement);
            
            fs.writeFileSync(podfilePath, podfileContent);
            console.log('✅ Added Firebase modular headers to Podfile');
          } else {
            console.warn('⚠️  Could not find target section in Podfile to add Firebase modular headers');
          }
        } else {
          console.log('✅ Firebase modular headers already present in Podfile');
        }
      } else {
        console.warn('⚠️  Podfile not found at:', podfilePath);
      }
      
      return config;
    },
  ]);
}

module.exports = withGoogleUtilitiesModularHeaders; 