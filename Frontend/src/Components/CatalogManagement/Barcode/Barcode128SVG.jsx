import React from "react";

// Standard Code 128 Width Patterns (0 to 106)
// Even positions in each array are bars (fill), odd positions are spaces.
// Character 103 is Start A, 104 is Start B, 105 is Start C, 106 is Stop.
const CODE128_WIDTHS = [
  [2, 1, 2, 2, 2, 2], // 0: [space]
  [2, 2, 2, 1, 2, 2], // 1: !
  [2, 2, 2, 2, 2, 1], // 2: "
  [1, 2, 1, 2, 2, 3], // 3: #
  [1, 2, 1, 3, 2, 2], // 4: $
  [1, 3, 1, 2, 2, 2], // 5: %
  [1, 2, 2, 2, 1, 3], // 6: &
  [1, 2, 2, 3, 1, 2], // 7: '
  [1, 3, 2, 2, 1, 2], // 8: (
  [2, 2, 1, 2, 1, 3], // 9: )
  [2, 2, 1, 3, 1, 2], // 10: *
  [2, 3, 1, 2, 1, 2], // 11: +
  [1, 1, 2, 2, 3, 2], // 12: ,
  [1, 2, 2, 1, 3, 2], // 13: -
  [1, 2, 2, 2, 3, 1], // 14: .
  [1, 1, 3, 2, 2, 2], // 15: /
  [1, 2, 3, 1, 2, 2], // 16: 0
  [1, 2, 3, 2, 2, 1], // 17: 1
  [2, 2, 3, 2, 1, 1], // 18: 2
  [2, 2, 1, 1, 3, 2], // 19: 3
  [2, 2, 1, 2, 3, 1], // 20: 4
  [2, 1, 3, 2, 1, 2], // 21: 5
  [2, 2, 3, 1, 1, 2], // 22: 6
  [3, 1, 2, 1, 3, 1], // 23: 7
  [3, 1, 1, 2, 2, 2], // 24: 8
  [3, 1, 2, 2, 2, 1], // 25: 9
  [3, 1, 1, 3, 2, 1], // 26: :
  [3, 3, 1, 1, 2, 1], // 27: ;
  [3, 1, 2, 1, 1, 3], // 28: <
  [3, 1, 2, 3, 1, 1], // 29: =
  [3, 3, 2, 1, 1, 1], // 30: >
  [3, 1, 4, 1, 1, 1], // 31: ?
  [2, 2, 1, 4, 1, 1], // 32: @
  [4, 3, 1, 1, 1, 1], // 33: A
  [1, 1, 1, 2, 2, 4], // 34: B
  [1, 1, 1, 4, 2, 2], // 35: C
  [1, 2, 1, 1, 2, 4], // 36: D
  [1, 2, 1, 4, 2, 1], // 37: E
  [1, 4, 1, 1, 2, 2], // 38: F
  [1, 4, 1, 2, 2, 1], // 39: G
  [1, 1, 2, 2, 1, 4], // 40: H
  [1, 1, 2, 4, 1, 2], // 41: I
  [1, 2, 2, 1, 1, 4], // 42: J
  [1, 2, 2, 4, 1, 1], // 43: K
  [1, 4, 2, 1, 1, 2], // 44: L
  [1, 4, 2, 2, 1, 1], // 45: M
  [2, 4, 1, 2, 1, 1], // 46: N
  [2, 2, 1, 1, 1, 4], // 47: O
  [4, 1, 3, 1, 1, 1], // 48: P
  [2, 4, 1, 1, 1, 2], // 49: Q
  [1, 3, 4, 1, 1, 1], // 50: R
  [1, 1, 1, 2, 4, 2], // 51: S
  [1, 2, 1, 1, 4, 2], // 52: T
  [1, 2, 1, 2, 4, 1], // 53: U
  [1, 1, 4, 2, 1, 2], // 54: V
  [1, 2, 4, 1, 1, 2], // 55: W
  [1, 2, 4, 2, 1, 1], // 56: X
  [4, 1, 1, 2, 1, 2], // 57: Y
  [4, 2, 1, 1, 1, 2], // 58: Z
  [4, 2, 1, 2, 1, 1], // 59: [
  [2, 1, 2, 1, 4, 1], // 60: \
  [2, 1, 4, 1, 2, 1], // 61: ]
  [4, 1, 2, 1, 2, 1], // 62: ^
  [1, 1, 1, 1, 4, 3], // 63: _
  [1, 1, 1, 3, 4, 1], // 64: `
  [1, 3, 1, 1, 4, 1], // 65: a
  [1, 1, 4, 1, 1, 3], // 66: b
  [1, 1, 4, 3, 1, 1], // 67: c
  [4, 1, 1, 1, 1, 3], // 68: d
  [4, 1, 1, 3, 1, 1], // 69: e
  [1, 1, 3, 1, 4, 1], // 70: f
  [1, 1, 4, 1, 3, 1], // 71: g
  [3, 1, 1, 1, 4, 1], // 72: h
  [4, 1, 1, 1, 3, 1], // 73: i
  [2, 1, 1, 4, 1, 2], // 74: j
  [2, 1, 1, 2, 1, 4], // 75: k
  [2, 1, 1, 2, 3, 2], // 76: l
  [2, 3, 3, 1, 1, 1], // 77: m
  [2, 1, 1, 1, 3, 3], // 78: n
  [2, 1, 1, 3, 1, 3], // 79: o
  [2, 3, 1, 1, 1, 3], // 80: p
  [2, 3, 1, 3, 1, 1], // 81: q
  [2, 1, 3, 1, 1, 3], // 82: r
  [2, 1, 3, 3, 1, 1], // 83: s
  [2, 1, 3, 1, 3, 1], // 84: t
  [3, 1, 1, 1, 2, 3], // 85: u
  [3, 1, 1, 3, 2, 1], // 86: v
  [3, 3, 1, 1, 1, 2], // 87: w
  [3, 1, 3, 1, 1, 2], // 88: x
  [3, 1, 3, 3, 1, 1], // 89: y
  [3, 1, 1, 1, 3, 2], // 90: z
  [3, 1, 1, 3, 1, 2], // 91: {
  [3, 3, 1, 1, 2, 1], // 92: |
  [3, 1, 2, 1, 1, 3], // 93: }
  [3, 1, 2, 3, 1, 1], // 94: ~
  [3, 1, 2, 1, 3, 1], // 95: DEL
  [3, 1, 1, 2, 3, 1], // 96: FNC 3
  [3, 1, 1, 2, 1, 3], // 97: FNC 2
  [3, 1, 1, 3, 1, 1], // 98: SHIFT
  [3, 1, 1, 1, 3, 1], // 99: CODE C
  [3, 1, 1, 1, 1, 3], // 100: CODE B
  [1, 2, 1, 1, 3, 3], // 101: FNC 4
  [1, 2, 1, 3, 1, 3], // 102: CODE A
  [1, 2, 3, 1, 1, 3], // 103: Start A
  [1, 2, 3, 3, 1, 1], // 104: Start B
  [1, 1, 3, 1, 1, 3], // 105: Start C
  [2, 3, 3, 1, 1, 1, 2], // 106: Stop (7 modules)
];

const Barcode128SVG = ({
  text = "",
  width = 150,
  height = 50,
  barColor = "#000000",
}) => {
  // Return empty block if no text provided
  if (!text) {
    return <div style={{ width, height }} className="bg-slate-50 border border-dashed border-slate-200 rounded-lg" />;
  }

  // Encode string using Code 128 Set B
  // Start B code (val 104)
  const encodedValues = [104];
  
  // Calculate character values (ASCII - 32)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 32 && code <= 127) {
      encodedValues.push(code - 32);
    } else {
      // Treat invalid characters as space
      encodedValues.push(0);
    }
  }

  // Compute Checksum: (StartValue + Sum(val * position)) % 103
  let checksum = encodedValues[0]; // 104
  for (let i = 1; i < encodedValues.length; i++) {
    checksum += encodedValues[i] * i;
  }
  const checkDigit = checksum % 103;
  encodedValues.push(checkDigit);

  // Append Stop code (val 106)
  encodedValues.push(106);

  // Build the array of bar/space widths
  const symbolWidths = [];
  encodedValues.forEach((val) => {
    symbolWidths.push(...CODE128_WIDTHS[val]);
  });

  // Calculate total module count to scale correctly
  // Code 128: 11 modules per symbol.
  // stop code has 13 modules.
  // total symbols = text.length + 3 (start, check, stop)
  // total modules = (text.length + 2) * 11 + 13
  const totalModules = symbolWidths.reduce((sum, w) => sum + w, 0);

  // Scale calculations
  const moduleWidth = width / totalModules;

  // Build SVG bars
  let currentX = 0;
  const bars = [];

  symbolWidths.forEach((w, index) => {
    const isBar = index % 2 === 0; // Even positions are black bars
    const barWidth = w * moduleWidth;
    
    if (isBar) {
      bars.push(
        <rect
          key={index}
          x={currentX}
          y={0}
          width={barWidth}
          height={height}
          fill={barColor}
        />
      );
    }
    currentX += barWidth;
  });

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>{bars}</g>
    </svg>
  );
};

export default Barcode128SVG;
