namespace cnma.carshop;

using {
    managed,
    cuid
} from '@sap/cds/common';

type InquiryStatus : String enum {
    NEW;
    CONTACTED;
    CLOSED;
}

type Status        : String enum {
    AVAILABLE;
    OUT_OF_STOCK;
    DISCONTINUED
}

type UserType      : String enum {
    CUSTOMER;
    SELLER
}

entity AppUser : cuid, managed {
    name        : String;
    email       : String;
    phoneNumber : String;
    age         : Integer;
    type        : UserType
}

entity Car : cuid, managed {
    name        : String;
    status      : Status;
    model       : String;
    year        : Integer;
    description : String;
    brand       : Association to one Brand;
    price       : Decimal(15, 2);
};

entity Brand : cuid, managed {
    name    : String;
    country : String;
    logoUrl : String;
}

entity Inquiry : cuid, managed {

    customer    : Association to one AppUser;

    car         : Association to one Car;

    title       : String;
    message     : String(1000);
    number      : String;
    status      : InquiryStatus default 'NEW';
    description : String

}
