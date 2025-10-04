declare module "react-native-qrcode-svg" {
  import * as React from "react";
  import { ViewStyle } from "react-native";

  export interface QRCodeProps {
    value: string;
    size?: number;
    color?: string;
    backgroundColor?: string;
    logo?: any;
    logoSize?: number;
    logoBackgroundColor?: string;
    getRef?: (c: any) => void;
    style?: ViewStyle;
  }

  export default class QRCode extends React.Component<QRCodeProps> {}
}
