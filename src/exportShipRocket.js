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
    const todayDate = formatDate(new Date());

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

        // Increment invoice number
        const invoiceNumber = `${parseInt(startingInvoiceNumber ?? 1) + index}`;

        /**
         * ZIP CODE LOGIC
         * - Keep leading zeroes for USA ZIP codes like 08080
         * - If ZIP+4 format exists like 28792-3017 -> use only 28792
         * - Force value as string/text
         */
        let zipCode = String(row?.zipCode || '').trim();

        if (row?.country === 'United States') {
            if (zipCode.includes('-')) {
                zipCode = zipCode.split('-')[0];
            }

            // Ensure 5-digit ZIP keeps leading zero
            zipCode = zipCode.padStart(5, '0');
        }

        const sellingPrice = 1;

        let shipmentWeight = '0.05';

        if (row?.noOfItems === 2) {
            shipmentWeight = '0.10';
        } else if (row?.noOfItems === 3) {
            shipmentWeight = '0.15';
        } else if (row?.noOfItems >= 4) {
            shipmentWeight = '0.20';
        }

        return {
            'Order ID': invoiceNumber,
            'Channel': 'Custom',
            'Order Date': row?.saleDate,
            'Purpose of Shipment(Gift/Sample)': 'Gift',
            'Currency': 'USD',
            'Customer First Name': customerFirstName,
            'Customer Last Name': customerLastName,
            'Email': row?.email || '',
            'Customer Mobile': row?.mobileNo || '7405392592',
            'Shipping Address Line 1': row?.addressLine1 || '',
            'Shipping Address Line 2': row?.addressLine2 || '',
            'Shipping Address Country': row?.country || '',

            // ZIP as text/string
            'Shipping Address Postcode': zipCode,

            'Shipping Address City': row?.city || '',
            'Shipping Address State': row?.state || 'NA',
            'Master SKU': 'CAP',
            'Product Name': 'Fabric Surgical Scrub Cap',
            'HSN code': '62101000',

            'Product Quantity': row?.noOfItems || '',

            'Tax': 1,
            'VAT Number': '',

            // Fixed selling price
            'Selling Price(Per Unit Item Inclusive of Tax)': sellingPrice,

            'Invoice Date': todayDate,

            'Length (cm)': 10,
            'Breadth (cm)': 8,
            'Height (cm)': 2,

            // Dynamic shipment weight
            'Weight Of Shipment(kg)': shipmentWeight,

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

    // Convert JSON to CSV
    const csv = Papa.unparse(mappedOrders, {
        header: true,
    });

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `shipRocket_${todayDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
