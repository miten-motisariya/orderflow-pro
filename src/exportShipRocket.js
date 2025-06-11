// ShipRocketCSV

import Papa from 'papaparse';

export const formatDate = (date) => {
    const d = new Date(date);
    const day = ('0' + d.getDate()).slice(-2);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const year = d.getFullYear();
    return `${day}-${month}-${year}`; // ShipRocket date format: dd-mm-yyyy
};

export const exportToShipRocketCSV = (orders, startingInvoiceNumber) => {
    const todayDate = formatDate(new Date()); // Get today's date in ShipRocket format

    const mappedOrders = orders.map((row, index) => {
        let customerFirstName = row?.firstName;
        let customerLastName = row?.lastName;

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

        // Increment the invoice number
        const invoiceNumber = `${parseInt(startingInvoiceNumber ?? 1) + index}`;

        // Adjust pincode for USA (limit to 5 characters if it contains a hyphen)
        let zipCode = row?.zipCode || '';
        if (row?.country === 'United States' && zipCode.length > 5) {
            zipCode = zipCode.slice(0, 5);  // Extract first 5 characters of the ZIP code
        }

        // Adjust selling price for Canada
        const sellingPrice = row?.country === 'Canada' ? 12 : 17;

        // Map fields from the order to ShipRocket CSV format
        return {
            'Order ID': invoiceNumber,
            'Channel': 'Custom',
            'Order Date': row?.saleDate,  // Assuming 'saleDate' is already in dd-mm-yyyy format
            'Purpose of Shipment(Gift/Sample)': 'Gift',
            'Currency': 'USD',
            'Customer First Name': customerFirstName,
            'Customer Last Name': customerLastName,
            'Email': row?.email || '',
            'Customer Mobile': row?.mobileNo || '7405392592',
            'Shipping Address Line 1': row?.addressLine1 || '',
            'Shipping Address Line 2': row?.addressLine2 || '',
            'Shipping Address Country': row?.country || '',
            'Shipping Address Postcode': zipCode, // Updated ZIP code
            'Shipping Address City': row?.city || '',
            'Shipping Address State': row?.state || 'NA',
            'Master SKU': 'CAP',
            'Product Name': 'Fabric Cotton Cap',
            'HSN code': '65061090', // Default HSN code for product
            'Product Quantity': row?.noOfItems || '',
            'Tax': 1, // Assuming tax is 0
            'VAT Number': '',
            'Selling Price(Per Unit Item Inclusive of Tax)': sellingPrice, // Updated price for Canada
            'Invoice Date': todayDate,  // Invoice date is today
            'Length (cm)': 10,          // Fixed value for length
            'Breadth (cm)': 8,          // Fixed value for breadth
            'Height (cm)': 2,           // Fixed value for height
            'Weight Of Shipment(kg)': '0.05', // Fixed weight
            'Ioss': '',
            'Eori': '',
            'Terms of Invoice': '',
            'Franchise Seller ID': '',
            'Courier ID': ''
        };
    });

    if (mappedOrders.length === 0) {
        alert('No valid rows available for export!');
        return;
    }

    // Use PapaParse to convert the JSON object to CSV
    const csv = Papa.unparse(mappedOrders, {
        header: true,
    });

    // Create a blob and download the file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `shipRocket_${todayDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
