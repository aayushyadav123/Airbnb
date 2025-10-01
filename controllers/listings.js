const Listing = require("../models/listing");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.map_Token;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

module.exports.index = async(req, res) =>{
    const allListings = await Listing.find({});
    res.render("listings/index", { allListings });
};

module.exports.renderNewForm = (req, res) =>{
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) =>{
    let {id} = req.params;
    const listing = await Listing.findById(id)
    .populate({
        path: "reviews",
        populate:{
        path: "author",
    }})
    .populate("owner");
    if(!listing){
        req.flash("error", "Listing you requested for does not exit!");
        return res.redirect("/listings");
    }
    console.log(listing);
    res.render("listings/show.ejs", {listing});
};

module.exports.createListing = async (req, res, next) =>{
    let response = await geocodingClient
    .forwardGeocode({
        query: req.body.listing.location,
        limit: 1,
    })
    .send();
    

    let url = req.file.path;
    let filename = req.file.filename;
     const newListing = new Listing(req.body.listing);
     newListing.owner = req.user._id;
     newListing.image = {url, filename};

     newListing.geometry = response.body.features[0].geometry;

     let savedListing = await newListing.save();
     console.log(savedListing);
     req.flash("success", "new Listing Created!");
     res.redirect("/listings");
   };

module.exports.renderEditForm = async (req, res) =>{
     let {id} = req.params;
    const listing = await Listing.findById(id);
     if(!listing){
        req.flash("error", "Listing you requested for does not exit!");
        return res.redirect("/listings");
    }

    let originalImageURl = listing.image.url;
    originalImageURl = originalImageURl.replace("/upload", "/upload/w_250");
    res.render("listings/edit.ejs", {listing, originalImageURl});
};


module.exports.updateListing = async (req, res) => {
    const { id } = req.params;

    const listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

    if (req.body.listing.location) {
        const geoData = await geocodingClient.forwardGeocode({
            query: req.body.listing.location,
            limit: 1
        }).send();

        listing.geometry = geoData.body.features[0].geometry; // new lat/lng
        listing.location = req.body.listing.location;        // new location text
        await listing.save();
    }

    req.flash("success", "Successfully updated listing!");
    res.redirect(`/listings/${listing._id}`);
};


module.exports.destroyListing = async(req, res) =>{
    let {id} = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
};