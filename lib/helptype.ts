import axios from "axios";

export const fetchHelpTypes = async (): Promise<string[]> => {
    try {
      // First get the conversation model to see available attributes
      const response = await axios.get('https://api.intercom.io/data_attributes', {
        headers: {
          'Authorization': `Bearer ${process.env.INTERCOM_ACCESS_TOKEN}`,
          'Accept': 'application/json',
        },
        params: {
          model: 'conversation'
        }
      });
  
      // Find your custom attribute for help types
      const helpTypeAttribute = response.data.data.find(
        (attr: any) => attr.name === 'help_type' || attr.name === 'category'
      );
  
      if (helpTypeAttribute && helpTypeAttribute.options) {
        return helpTypeAttribute.options;
      }
  
      return [];
    } catch (error) {
      console.error('Error fetching Intercom data attributes:', error);
      return [];
    }
  };