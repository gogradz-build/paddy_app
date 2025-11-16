import { MaterialIcons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type FarmerPaddy = {
  id: string;
  farmerUid: string;
  paddyCode: string;
  qty: number;
  price: number;
  createdAt: any;
  [key: string]: any;
};

type User = {
  id: string;
  name: string;
  [key: string]: any;
};

type BagSale = {
  id: string;
  farmerPaddyUID: string;
  bagsSold: number;
  qtySold: number;
  saleDate: any;
  [key: string]: any;
};

interface DownloadReportButtonProps {
  style?: any;
}

const DownloadReportButton: React.FC<DownloadReportButtonProps> = ({ style }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const db = getFirestore();

  const fetchFarmerPaddyData = async (): Promise<FarmerPaddy[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, 'farmer_paddy'));
      const data: FarmerPaddy[] = [];
      
      querySnapshot.forEach((doc) => {
        data.push({
          id: doc.id,
          ...doc.data()
        } as FarmerPaddy);
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching farmer paddy data:', error);
      throw error;
    }
  };

  const fetchBagSalesData = async (): Promise<BagSale[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, 'bag_sales'));
      const data: BagSale[] = [];
      
      querySnapshot.forEach((doc) => {
        data.push({
          id: doc.id,
          ...doc.data()
        } as BagSale);
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching bag sales data:', error);
      throw error;
    }
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const generateHTMLReport = (farmerPaddyData: FarmerPaddy[], bagSalesData: BagSale[]): string => {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Calculate totals
    const totalPaddyQuantity = farmerPaddyData.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalPaddyValue = farmerPaddyData.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
    const totalBagsSold = bagSalesData.reduce((sum, item) => sum + (Number(item.bagsSold) || 0), 0);
    const totalQtySold = bagSalesData.reduce((sum, item) => sum + (Number(item.qtySold) || 0), 0);

    // Group bag sales by farmerPaddyUID
    const bagSalesByPaddy = bagSalesData.reduce((acc, sale) => {
      if (!acc[sale.farmerPaddyUID]) {
        acc[sale.farmerPaddyUID] = [];
      }
      acc[sale.farmerPaddyUID].push(sale);
      return acc;
    }, {} as Record<string, BagSale[]>);

    const farmerPaddyRows = farmerPaddyData.map((item, index) => {
      const relatedSales = bagSalesByPaddy[item.id] || [];
      const salesInfo = relatedSales.length > 0 
        ? `${relatedSales.length} sales` 
        : 'No sales';
      
      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.id}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.farmerName || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.paddyType || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${Number(item.quantity || 0).toFixed(2)} kg</td>
          <td style="padding: 8px; border: 1px solid #ddd;">LKR ${Number(item.price || 0).toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(item.createdAt)}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${salesInfo}</td>
        </tr>
      `;
    }).join('');

    const bagSalesRows = bagSalesData.map((item, index) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.farmerPaddyUID}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${Number(item.bagsSold || 0)}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${Number(item.qtySold || 0).toFixed(2)} kg</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(item.saleDate)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #759226;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #759226;
            margin: 0;
            font-size: 28px;
          }
          .header p {
            color: #666;
            margin: 5px 0;
          }
          .summary {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #759226;
          }
          .summary h3 {
            margin-top: 0;
            color: #759226;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 10px;
          }
          .summary-item {
            padding: 10px;
            background: white;
            border-radius: 5px;
          }
          .summary-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
          }
          .summary-value {
            font-size: 18px;
            font-weight: bold;
            color: #333;
          }
          .section {
            margin-bottom: 40px;
          }
          .section h2 {
            color: #759226;
            border-bottom: 2px solid #759226;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            background: white;
          }
          th {
            background-color: #759226;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #ddd;
          }
          td {
            padding: 8px;
            border: 1px solid #ddd;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          .no-data {
            text-align: center;
            padding: 20px;
            color: #999;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌾 Paddy Farm Management Report</h1>
          <p>Generated on: ${currentDate}</p>
        </div>

        <div class="summary">
          <h3>📊 Summary Statistics</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Total Paddy Records</div>
              <div class="summary-value">${farmerPaddyData.length}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Paddy Quantity</div>
              <div class="summary-value">${totalPaddyQuantity.toFixed(2)} kg</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Paddy Value</div>
              <div class="summary-value">LKR ${totalPaddyValue.toFixed(2)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Bags Sold</div>
              <div class="summary-value">${totalBagsSold}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Quantity Sold</div>
              <div class="summary-value">${totalQtySold.toFixed(2)} kg</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Sales Records</div>
              <div class="summary-value">${bagSalesData.length}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>🌾 Farmer Paddy Records</h2>
          ${farmerPaddyData.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Paddy ID</th>
                  <th>Farmer Name</th>
                  <th>Paddy Type</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Created Date</th>
                  <th>Sales</th>
                </tr>
              </thead>
              <tbody>
                ${farmerPaddyRows}
              </tbody>
            </table>
          ` : '<div class="no-data">No farmer paddy records found</div>'}
        </div>

        <div class="section">
          <h2>💰 Bag Sales Records</h2>
          ${bagSalesData.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Farmer Paddy ID</th>
                  <th>Bags Sold</th>
                  <th>Quantity Sold</th>
                  <th>Sale Date</th>
                </tr>
              </thead>
              <tbody>
                ${bagSalesRows}
              </tbody>
            </table>
          ` : '<div class="no-data">No bag sales records found</div>'}
        </div>

        <div class="footer">
          <p>This report was automatically generated by the Paddy Farm Management System</p>
          <p>© ${new Date().getFullYear()} - All Rights Reserved</p>
        </div>
      </body>
      </html>
    `;
  };

  const handleDownloadReport = async () => {
    try {
      setIsGenerating(true);

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        setIsGenerating(false);
        return;
      }

      // Fetch data
      const [farmerPaddyData, bagSalesData] = await Promise.all([
        fetchFarmerPaddyData(),
        fetchBagSalesData()
      ]);

      // Generate HTML
      const htmlContent = generateHTMLReport(farmerPaddyData, bagSalesData);

      // Generate PDF using Print API
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      // Create a new File instance with better filename
      const fileName = `Paddy_Farm_Report_${new Date().getTime()}.pdf`;
      const tempFile = new File(uri);
      const destinationFile = new File(Paths.cache, fileName);

      // Copy the generated PDF to a more accessible location
      tempFile.copy(destinationFile);

      // Share the PDF
      await Sharing.shareAsync(destinationFile.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Paddy Farm Report',
        UTI: 'com.adobe.pdf'
      });

      Alert.alert(
        'Success',
        'Report generated successfully!',
        [
          {
            text: 'OK',
            onPress: () => console.log('Report generated:', destinationFile.uri)
          }
        ]
      );

    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert(
        'Error',
        'Failed to generate report. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View style={[styles.smallcard, style]}>
      <MaterialIcons name="download" color={'#000'} size={32} />
      <TouchableOpacity 
        style={[styles.bttn, isGenerating && styles.bttnDisabled]} 
        onPress={handleDownloadReport}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.bttntext}>Download Report</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default DownloadReportButton;

const styles = StyleSheet.create({
  smallcard: {
    width: 104,
    alignItems: 'center',
    gap: 8
  },
  bttn: {
    width: 100,
    height: 32,
    borderRadius: 26,
    backgroundColor: '#000',
    alignItems: 'center',
    alignContent: 'center',
    justifyContent: 'center'
  },
  bttnDisabled: {
    backgroundColor: '#666',
    opacity: 0.6
  },
  bttntext: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter-Regular'
  }
});