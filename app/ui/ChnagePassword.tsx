import { ArrowIcon } from '@/assets/icons/ArrowIcon';
import { useUser } from '@/contexts/UserContext';
import { auth } from '@/firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface ChangePasswordProps {
  setChangePassword: any;
}

const ChangePassword = ({ setChangePassword }: ChangePasswordProps) => {
  const { user, updateUserProfile } = useUser();

  // Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Validation
  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!currentPassword.trim()) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (currentPassword === newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (!validateForm() || !user || !auth.currentUser) return;

    setIsLoading(true);

    try {
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password in Firebase Auth
      await updatePassword(auth.currentUser, newPassword);

      // Update password in local database
      await updateUserProfile({
        password: newPassword,
        updatedAt: new Date().toISOString()
      });

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});

      Alert.alert(
        'Success!',
        'Your password has been changed successfully. Your new password has been saved securely.',
        [
          {
            text: 'OK',
            onPress: () => setChangePassword(false)
          }
        ]
      );

    } catch (error: any) {
      console.error('Password change error:', error);
      
      let errorMessage = 'Failed to change password. Please try again.';
      
      switch (error.code) {
        case 'auth/wrong-password':
          setErrors({ currentPassword: 'Current password is incorrect' });
          return;
        case 'auth/weak-password':
          setErrors({ newPassword: 'New password is too weak' });
          return;
        case 'auth/requires-recent-login':
          errorMessage = 'Please log out and log back in before changing your password.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection and try again.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later.';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      Alert.alert('Password Change Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return { level: 0, text: 'Too short', color: '#FF6B6B' };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { level: 1, text: 'Weak', color: '#FF6B6B' };
    if (score <= 3) return { level: 2, text: 'Fair', color: '#FFA726' };
    if (score <= 4) return { level: 3, text: 'Good', color: '#66BB6A' };
    return { level: 4, text: 'Strong', color: '#4CAF50' };
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const canSubmit = currentPassword && newPassword && confirmPassword && Object.keys(errors).length === 0 && !isLoading;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setChangePassword(false)}>
          <ArrowIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Change Password</Text>
        <View style={{ width: 24 }} />
      </View>

    
      <View style={styles.securityNotice}>
        <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
        <View style={styles.securityTextContainer}>
          <Text style={styles.securityTitle}>Security Notice</Text>
          <Text style={styles.securityText}>
            Your password is encrypted and stored securely. Choose a strong password to protect your account.
          </Text>
        </View>
      </View>

      {/* Form Container */}
      <View style={styles.formContainer}>
        {/* Current Password */}
        <Text style={styles.label}>Current Password *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Enter your current password"
            style={[styles.passwordInput, errors.currentPassword && styles.inputError]}
            value={currentPassword}
            onChangeText={(text) => {
              setCurrentPassword(text);
              if (errors.currentPassword) {
                setErrors(prev => ({ ...prev, currentPassword: '' }));
              }
            }}
            secureTextEntry={!showCurrentPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowCurrentPassword(!showCurrentPassword)}
          >
            <Ionicons
              name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>
        {errors.currentPassword && (
          <Text style={styles.errorText}>{errors.currentPassword}</Text>
        )}

        {/* New Password */}
        <Text style={styles.label}>New Password *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Enter your new password"
            style={[styles.passwordInput, errors.newPassword && styles.inputError]}
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              if (errors.newPassword) {
                setErrors(prev => ({ ...prev, newPassword: '' }));
              }
            }}
            secureTextEntry={!showNewPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowNewPassword(!showNewPassword)}
          >
            <Ionicons
              name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>
        {errors.newPassword && (
          <Text style={styles.errorText}>{errors.newPassword}</Text>
        )}

        {/* Password Strength Indicator */}
        {newPassword.length > 0 && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBar}>
              <View 
                style={[
                  styles.strengthFill, 
                  { 
                    width: `${(passwordStrength.level / 4) * 100}%`, 
                    backgroundColor: passwordStrength.color 
                  }
                ]} 
              />
            </View>
            <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
              {passwordStrength.text}
            </Text>
          </View>
        )}

        {/* Confirm Password */}
        <Text style={styles.label}>Confirm New Password *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Re-enter your new password"
            style={[styles.passwordInput, errors.confirmPassword && styles.inputError]}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword) {
                setErrors(prev => ({ ...prev, confirmPassword: '' }));
              }
            }}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Ionicons
              name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && (
          <Text style={styles.errorText}>{errors.confirmPassword}</Text>
        )}

        {/* Password Requirements */}
        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>Password Requirements:</Text>
          <View style={styles.requirementItem}>
            <Ionicons 
              name={newPassword.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'} 
              size={16} 
              color={newPassword.length >= 6 ? '#4CAF50' : '#ccc'} 
            />
            <Text style={[styles.requirementText, newPassword.length >= 6 && styles.requirementMet]}>
              At least 6 characters
            </Text>
          </View>
          <View style={styles.requirementItem}>
            <Ionicons 
              name={/[A-Z]/.test(newPassword) ? 'checkmark-circle' : 'ellipse-outline'} 
              size={16} 
              color={/[A-Z]/.test(newPassword) ? '#4CAF50' : '#ccc'} 
            />
            <Text style={[styles.requirementText, /[A-Z]/.test(newPassword) && styles.requirementMet]}>
              One uppercase letter (recommended)
            </Text>
          </View>
          <View style={styles.requirementItem}>
            <Ionicons 
              name={/[0-9]/.test(newPassword) ? 'checkmark-circle' : 'ellipse-outline'} 
              size={16} 
              color={/[0-9]/.test(newPassword) ? '#4CAF50' : '#ccc'} 
            />
            <Text style={[styles.requirementText, /[0-9]/.test(newPassword) && styles.requirementMet]}>
              One number (recommended)
            </Text>
          </View>
        </View>

        {/* Change Password Button */}
        <TouchableOpacity
          style={[
            styles.changeButton,
            !canSubmit && styles.changeButtonDisabled
          ]}
          onPress={handleChangePassword}
          disabled={!canSubmit}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed-outline" size={20} color="#fff" />
              <Text style={styles.changeButtonText}>Change Password</Text>
            </>
          )}
        </TouchableOpacity>

        
      </View>
    </ScrollView>
  );
};

export default ChangePassword;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8F5E8',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  securityTextContainer: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    color: '#4CAF50',
    lineHeight: 18,
  },
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 15,
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  strengthContainer: {
    marginBottom: 16,
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    marginBottom: 4,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
    // transition: 'width 0.3s ease',
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  requirementsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 12,
    color: '#666',
  },
  requirementMet: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  changeButton: {
    backgroundColor: '#759226',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  changeButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  changeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
  },
  helpText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});