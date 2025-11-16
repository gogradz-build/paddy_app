// components/ErrorBoundary.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Ionicons name="alert-circle" size={80} color="#ff6b6b" />
            
            <Text style={styles.title}>Oops! Something went wrong</Text>
            
            <Text style={styles.message}>
              We encountered an unexpected error. Don't worry, your data is safe.
            </Text>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details (Dev Mode):</Text>
                <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                
                {this.state.errorInfo && (
                  <>
                    <Text style={styles.errorTitle}>Component Stack:</Text>
                    <Text style={styles.errorText}>
                      {this.state.errorInfo.componentStack}
                    </Text>
                  </>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.resetButton}
              onPress={this.handleReset}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.resetButtonText}>Try Again</Text>
            </TouchableOpacity>

            <Text style={styles.helpText}>
              If this problem persists, please contact support
            </Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  errorDetails: {
    width: '100%',
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff6b6b',
    marginBottom: 8,
    marginTop: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  resetButton: {
    backgroundColor: '#759226',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    gap: 10,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginTop: 20,
    textAlign: 'center',
  },
});

export default ErrorBoundary;


// HOC version for functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}