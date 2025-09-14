import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
    size?: number;
    color?: string;
    direction?: 'right' | 'left';
}

export const ArrowIcon = ({
    size = 24,
    color = '#000000',
    direction = 'right',
}: IconProps) => {
    const isLeft = direction === 'left';
    return (
        <Svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
        >
            <Path
                d="M11.1 7.94L8.48 10.56C7.71 11.33 7.71 12.59 8.48 13.36L15 19.87"
                stroke={color}
                strokeWidth={1.5}
                strokeMiterlimit={10}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Path
                d="M15 4.04L13.96 5.08"
                stroke={color}
                strokeWidth={1.5}
                strokeMiterlimit={10}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
};

const styles = StyleSheet.create({
    flipped: {
        transform: [{ scaleX: -1 }],
    },
});
