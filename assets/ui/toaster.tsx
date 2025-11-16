import { Ionicons } from "@expo/vector-icons";
import React, { createContext, useContext, useRef, useState } from "react";
import { Animated, Dimensions, StyleSheet, Text } from "react-native";

const { width, height } = Dimensions.get("window");

type ToasterVariant = "success" | "warning" | "error";

interface VariantStyles {
  backgroundColor: string;
  borderColor: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
}

interface ToasterContextProps {
  showToaster: (message: string, variant?: ToasterVariant, duration?: number) => void;
}

const ToasterContext = createContext<ToasterContextProps | undefined>(undefined);

export const useToaster = () => {
  const context = useContext(ToasterContext);
  if (!context) throw new Error("useToaster must be used within ToasterProvider");
  return context;
};

export const ToasterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [variant, setVariant] = useState<ToasterVariant>("success");

  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const getVariantStyles = (): VariantStyles => {
    switch (variant) {
      case "success":
        return {
          backgroundColor: "#10B981",
          borderColor: "#059669",
          iconName: "checkmark-circle",
          iconColor: "#FFFFFF",
        };
      case "warning":
        return {
          backgroundColor: "#F59E0B",
          borderColor: "#D97706",
          iconName: "warning",
          iconColor: "#FFFFFF",
        };
      case "error":
        return {
          backgroundColor: "#EF4444",
          borderColor: "#DC2626",
          iconName: "close-circle",
          iconColor: "#FFFFFF",
        };
      default:
        return {
          backgroundColor: "#10B981",
          borderColor: "#059669",
          iconName: "checkmark-circle",
          iconColor: "#FFFFFF",
        };
    }
  };

  const showToaster = (msg: string, v: ToasterVariant = "success", duration = 3000) => {
    console.log("showToaster called with:", { msg, v, duration });
    setMessage(msg);
    setVariant(v);
    setVisible(true);
    console.log("State updated - visible:", true, "message:", msg);

    // Reset animations first
    slideAnim.setValue(100);
    opacityAnim.setValue(0);
    console.log("Animations reset, starting animation...");

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start((finished) => {
      console.log("Animation completed:", finished);
    });

    setTimeout(() => {
      console.log("Auto-hiding toaster after", duration, "ms");
      hideToaster();
    }, duration);
  };

  const hideToaster = () => {
    console.log("hideToaster called");
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      console.log("Hide animation completed, setting visible to false");
      setVisible(false);
    });
  };

  const variantStyles = getVariantStyles();
  console.log("ToasterProvider render - visible:", visible, "message:", message);

  return (
    <ToasterContext.Provider value={{ showToaster }}>
      {children}
      {/* Always render the toaster container for debugging */}
      {visible && (
        <>
          {/* Debug: Simple test view */}
          
          
          {/* Original animated toaster */}
          <Animated.View
            style={[
              styles.container,
              {
                backgroundColor: variantStyles.backgroundColor,
                borderLeftColor: variantStyles.borderColor,
                transform: [{ translateY: slideAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            <Ionicons
              name={variantStyles.iconName}
              size={22}
              color={variantStyles.iconColor}
              style={{ marginRight: 10 }}
            />
            <Text style={styles.message}>{message}</Text>
          </Animated.View>
        </>
      )}
    </ToasterContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    minHeight: 60,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 20, // Increased elevation
    zIndex: 99999, // Increased z-index
  },
  message: {
    color: "#fff",
    fontSize: 15,
    flex: 1,
    fontWeight: "500",
  },
});

// Alternative simplified version for testing
// export const SimpleToasterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const [visible, setVisible] = useState(false);
//   const [message, setMessage] = useState("");
//   const [variant, setVariant] = useState<ToasterVariant>("success");

//   const showToaster = (msg: string, v: ToasterVariant = "success", duration = 3000) => {
//     console.log("Simple showToaster called:", msg);
//     setMessage(msg);
//     setVariant(v);
//     setVisible(true);

//     setTimeout(() => {
//       console.log("Simple hiding toaster");
//       setVisible(false);
//     }, duration);
//   };

//   console.log("Simple ToasterProvider render - visible:", visible);

//   return (
//     <ToasterContext.Provider value={{ showToaster }}>
//       {children}
//       {visible && (
//         <View style={{
//           position: 'absolute',
//           bottom: 100,
//           left: 20,
//           right: 20,
//           backgroundColor: '#10B981',
//           padding: 20,
//           borderRadius: 10,
//           zIndex: 99999,
//           elevation: 20
//         }}>
//           <Text style={{ color: 'white', fontSize: 16 }}>
//             {message}
//           </Text>
//         </View>
//       )}
//     </ToasterContext.Provider>
//   );
// };