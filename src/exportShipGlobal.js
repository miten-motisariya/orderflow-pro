// ShipGlobalCSV

import Papa from 'papaparse';
import countryData from './countryCode.json'

const getCountryCode = (countryName) => {
    const country = countryData.find(c => c.country_name.toLowerCase() === countryName.toLowerCase());
    return country ? country.country_iso2 : countryName;
};

export const formatDate = (date) => {
    const d = new Date(date);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${d.getFullYear()}-${month}-${day}`;
};

export const exportToShipGlobalCSV = (orders, startingInvoiceNumber) => {
    const todayDate = formatDate(new Date()); // Get today's date in the required format

    const mappedOrders = orders.map((row, index) => {

        const currency = 'USD';
        const packageWeight = '0.05';
        let customerFirstName = row?.firstName;
        let customerLastName = row?.lastName;
        const customerShippingAddress = row?.addressLine1 || '';
        const customerShippingCity = row?.city || '';
        const customerShippingPostcode = row?.zipCode || '';
        const customerShippingState = row?.state || 'NA'; 
        const customerShippingCountryCode = getCountryCode(row?.country || '');
        const vendorOrderItemName = 'Fabric Cotton Cap';
        const vendorOrderItemQuantity = row?.noOfItems || '';
        
        // Dynamic unit price based on quantity
        let vendorOrderItemUnitPrice;
        const quantity = parseInt(vendorOrderItemQuantity);
        
        if (quantity === 1) {
            vendorOrderItemUnitPrice = 11;
        } else if (quantity === 2) {
            vendorOrderItemUnitPrice = 11 / 2;
        } else if (quantity === 3) {
            vendorOrderItemUnitPrice = 11 / 3;
        } else {
            vendorOrderItemUnitPrice = 11; // Default fallback for other quantities
        }

        // Destructure address if Street 2 is empty
        let address1 = customerShippingAddress;
        let address2 = row?.addressLine2 || '';
        if (!address2 && customerShippingAddress) {
            const addressParts = customerShippingAddress.match(/^(\d+\s*)(.*)$/);
            if (addressParts) {
                address1 = addressParts[1].trim(); // Contains house number and street name
                address2 = addressParts[2].trim(); // Contains the rest of the address, if any
            } else {
                address2 = address1;
            }
        }

         // Extract and split name if customerLastName is missing
    if (!customerLastName && row?.fullName) {
        const fullNameParts = row?.fullName.trim().split(/\s+/);
        if (fullNameParts.length > 1) {
            customerFirstName = fullNameParts[0];
            customerLastName = fullNameParts.slice(1).join(' ');
        } else {
            customerFirstName = fullNameParts[0];
            customerLastName = fullNameParts[0];
        }
    }

        // Ensure required fields are populated
        const missingFields = [];
        if (!currency) missingFields.push('currency');
        if (!customerFirstName) missingFields.push('customerFirstName');
        if (!customerLastName) missingFields.push('customerLastName');
        if (!customerShippingAddress) missingFields.push('customerShippingAddress');
        if (!customerShippingCity) missingFields.push('customerShippingCity');
        if (!customerShippingPostcode) missingFields.push('customerShippingPostcode');
        if (!customerShippingCountryCode) missingFields.push('customerShippingCountryCode');
        if (!vendorOrderItemQuantity) missingFields.push('vendorOrderItemQuantity');

        // Check if there are any missing fields
        if (missingFields.length > 0) {
            console.error(`Skipping row due to missing required fields: ${missingFields.join(', ')} in row: ${JSON.stringify(row)}`);
            return null; // Skip this row if any required field is missing
        }

        // Determine the service type based on quantity
        const service = customerShippingCountryCode === "US" ? 'ShipGlobal First Class' : 'ShipGlobal Direct';

        // Increment the invoice number
        const invoiceNumber = `${parseInt(startingInvoiceNumber ?? 1) + index}`;

        // Map fields from the order CSV to ShipGlobal format
        return {
            invoice_no: invoiceNumber,
            invoice_date: todayDate,
            order_reference: '',
            service: service,
            package_weight: packageWeight,
            package_length: 10,
            package_breadth: 8,
            package_height: 2,
            currency_code: currency,
            csb5_status: 0,
            customer_shipping_firstname: customerFirstName,
            customer_shipping_lastname: customerLastName,
            customer_shipping_mobile: row?.mobileNo || '919537177677',
            customer_shipping_email: row?.email || 'babubhaimotisariya@gmail.com',
            customer_shipping_company: '',
            customer_shipping_address: address1,
            customer_shipping_address_2: address2,
            customer_shipping_address_3: '',
            customer_shipping_city: customerShippingCity,
            customer_shipping_postcode: customerShippingPostcode,
            customer_shipping_country_code: customerShippingCountryCode,
            customer_shipping_state: customerShippingState,
            vendor_order_item_name: vendorOrderItemName,
            vendor_order_item_sku: '',
            vendor_order_item_quantity: vendorOrderItemQuantity,
            vendor_order_item_unit_price: vendorOrderItemUnitPrice,
            vendor_order_item_hsn: '65061090', // Default HSN code
            vendor_order_item_tax_rate: 0,
            ioss_number: '',
            csbv5_limit_comfirmation: ''
        };
    }).filter(row => row !== null); // Remove any rows that failed validation

    if (mappedOrders.length === 0) {
        alert('No valid rows available for export!');
        return;
    }

    const csv = Papa.unparse(mappedOrders, {
        header: [
            { id: 'invoice_no', title: 'invoice_no' },
            { id: 'invoice_date', title: 'invoice_date' },
            { id: 'order_reference', title: 'order_reference' },
            { id: 'service', title: 'service' },
            { id: 'package_weight', title: 'package_weight' },
            { id: 'package_length', title: 'package_length' },
            { id: 'package_breadth', title: 'package_breadth' },
            { id: 'package_height', title: 'package_height' },
            { id: 'currency_code', title: 'currency_code' },
            { id: 'csb5_status', title: 'csb5_status' },
            { id: 'customer_shipping_firstname', title: 'customer_shipping_firstname' },
            { id: 'customer_shipping_lastname', title: 'customer_shipping_lastname' },
            { id: 'customer_shipping_mobile', title: 'customer_shipping_mobile' },
            { id: 'customer_shipping_email', title: 'customer_shipping_email' },
            { id: 'customer_shipping_company', title: 'customer_shipping_company' },
            { id: 'customer_shipping_address', title: 'customer_shipping_address' },
            { id: 'customer_shipping_address_2', title: 'customer_shipping_address_2' },
            { id: 'customer_shipping_address_3', title: 'customer_shipping_address_3' },
            { id: 'customer_shipping_city', title: 'customer_shipping_city' },
            { id: 'customer_shipping_postcode', title: 'customer_shipping_postcode' },
            { id: 'customer_shipping_country_code', title: 'customer_shipping_country_code' },
            { id: 'customer_shipping_state', title: 'customer_shipping_state' },
            { id: 'vendor_order_item_name', title: 'vendor_order_item_name' },
            { id: 'vendor_order_item_sku', title: 'vendor_order_item_sku' },
            { id: 'vendor_order_item_quantity', title: 'vendor_order_item_quantity' },
            { id: 'vendor_order_item_unit_price', title: 'vendor_order_item_unit_price' },
            { id: 'vendor_order_item_hsn', title: 'vendor_order_item_hsn' },
            { id: 'vendor_order_item_tax_rate', title: 'vendor_order_item_tax_rate' },
            { id: 'ioss_number', title: 'ioss_number' },
            { id: 'csbv5_limit_comfirmation', title: 'csbv5_limit_comfirmation' }
        ]
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `shipGlobal_${formatDate(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};