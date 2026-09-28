class CustomerResource {
  constructor(customer) {
    this.customer = customer;
  }

  details() {
    return {
      id: this.customer.id,
      name: this.customer.name,
      email: this.customer.email,
      phone: this.customer.phone,
      profileImage: this.customer.profileImage,
      isActive: this.customer.isActive,
      createdAt: this.customer.createdAt,

      // Language Mapping
      // In your schema, it's 'lang' for the code (en, fr, etc.)
      language: this.customer.language
        ? {
            id: this.customer.language.id,
            code: this.customer.language.lang, 
            name: this.customer.language.name,
          }
        : null,

      // Interests Mapping
      interests: this.customer.interests
        ? this.customer.interests.map((interest) => {
            const category = interest.category;
            
            // Find the translation matching the customer's languageId
            const translation = category?.translations?.find(
              (t) => t.languageId === this.customer.languageId
            );

            return {
              id: category?.id,
              // ✅ Use translated name if it exists, otherwise fallback to default name
              name: translation ? translation.name : category?.name,
              type: category?.type,
            };
          })
        : [],

         subscription: this.customer.subscriptions && this.customer.subscriptions.length > 0
          ? {
              id: this.customer.subscriptions[0].id,
              status: this.customer.subscriptions[0].status,
              startsAt: this.customer.subscriptions[0].startsAt,
              endsAt: this.customer.subscriptions[0].endsAt,
              isAutoRenew: this.customer.subscriptions[0].isAutoRenew,
              source: this.customer.subscriptions[0].source,
              plan: this.customer.subscriptions[0].plan
                ? {
                    id: this.customer.subscriptions[0].plan.id,
                    name: this.customer.subscriptions[0].plan.name,
                    code: this.customer.subscriptions[0].plan.code,
                    description: this.customer.subscriptions[0].plan.description,
                    price: this.customer.subscriptions[0].plan.price,
                    currency: this.customer.subscriptions[0].plan.currency,
                    durationDays: this.customer.subscriptions[0].plan.durationDays,
                    features: this.customer.subscriptions[0].plan.features,
                    isActive: this.customer.subscriptions[0].plan.isActive,
                  }
                : null,
            }
          : null,
    };
  }

  // Optional: static helper for single response
  static make(customer) {
    return new CustomerResource(customer).details();
  }

  // Optional: collection helper
  static collection(customers) {
    return customers.map(customer =>
      new CustomerResource(customer).details()
    );
  }
}

export default CustomerResource;